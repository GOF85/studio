
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Truck } from 'lucide-react';

export default function PortalHomePage() {
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-headline font-bold tracking-tight">Portal de Colaboradores</h1>
        <p className="text-lg text-muted-foreground mt-2">Selecciona tu portal para acceder a tus tareas asignadas.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
        <Link href="/portal/partner">
            <Card className="hover:border-primary hover:shadow-lg transition-all">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Factory /> Portal de Partner de Producción</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Accede para ver los pedidos de producción de gastronomía que tienes asignados.</p>
                </CardContent>
            </Card>
        </Link>
        <Link href="/portal/transporte">
            <Card className="hover:border-primary hover:shadow-lg transition-all">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Truck /> Portal de Transporte</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Consulta tus rutas de entrega y gestiona los albaranes.</p>
                </CardContent>
            </Card>
        </Link>
      </div>
    </main>
  );
}

