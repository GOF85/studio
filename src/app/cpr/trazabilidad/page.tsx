'use client';

import { useState, useMemo } from 'react';
import { History, Search, Package, Factory, Calendar } from 'lucide-react';
import type { OrdenFabricacion, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/layout/loading-skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function TrazabilidadPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loteEncontrado, setLoteEncontrado] = useState<OrdenFabricacion | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const allOFs: OrdenFabricacion[] = JSON.parse(localStorage.getItem('ordenesFabricacion') || '[]');
      const found = allOFs.find(of => of.id.toLowerCase() === searchTerm.toLowerCase());
      setLoteEncontrado(found || null);

      if (found) {
        const allOS: ServiceOrder[] = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
        const relatedOS = allOS.filter(os => found.osIDs.includes(os.id));
        setServiceOrders(relatedOS);
      } else {
        setServiceOrders([]);
      }

      setIsLoading(false);
    }, 500);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <History />
            Trazabilidad de Lotes
          </h1>
          <p className="text-muted-foreground mt-1">Busca un lote (OF) para ver su ciclo de vida y los eventos asociados.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-8">
        <Input
          type="search"
          placeholder="Introduce un Nº de Lote (ej: OF-2024-001)..."
          className="max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={!searchTerm || isLoading}>
            {isLoading ? <span className="animate-spin">⏳</span> : <Search className="mr-2"/>}
            Buscar
        </Button>
      </div>

      {isLoading ? (
        <Card>
            <CardHeader><CardTitle><div className="h-6 bg-muted rounded w-1/3"></div></CardTitle></CardHeader>
            <CardContent><div className="h-20 bg-muted rounded w-full"></div></CardContent>
        </Card>
      ) : loteEncontrado ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lote: {loteEncontrado.id}</span>
                <Badge variant="outline">{loteEncontrado.estado}</Badge>
              </CardTitle>
              <CardDescription>
                <span className="flex items-center gap-2"><Factory /> {loteEncontrado.cantidadTotal} {loteEncontrado.unidad} de <strong>{loteEncontrado.elaboracionNombre}</strong></span>
                <span className="flex items-center gap-2"><Calendar /> Producido el {format(new Date(loteEncontrado.fechaProduccionPrevista), 'dd/MM/yyyy')}</span>
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl"><Package />Utilizado en los siguientes eventos:</CardTitle>
            </CardHeader>
             <CardContent>
                {serviceOrders.length > 0 ? (
                    <div className="border rounded-lg">
                        <ul className="divide-y">
                            {serviceOrders.map(os => (
                                <li key={os.id} className="p-3 hover:bg-muted/50 transition-colors">
                                    <Link href={`/os?id=${os.id}`} className="flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{os.serviceNumber}</p>
                                            <p className="text-sm text-muted-foreground">{os.client}</p>
                                        </div>
                                        <p className="text-sm">{format(new Date(os.startDate), 'dd/MM/yyyy')}</p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center p-6">Este lote no se ha asignado a ningún evento todavía.</p>
                )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-center text-muted-foreground p-10">
          {searchTerm ? `No se encontró ningún lote con el ID "${searchTerm}".` : 'Introduce un ID de lote para empezar la búsqueda.'}
        </p>
      )}
    </div>
  );
}
